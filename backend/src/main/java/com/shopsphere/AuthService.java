package com.shopsphere;

import static com.shopsphere.Models.*;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private final JdbcTemplate db;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
  private final SecureRandom random = new SecureRandom();
  private final String dummyHash = passwords.encode("constant-time-dummy-password");

  public AuthService(JdbcTemplate db) {
    this.db = db;
  }

  @Transactional
  public Auth register(Registration r) {
    String email = r.email().strip().toLowerCase(Locale.ROOT);
    if (!db.queryForList("SELECT id FROM customers WHERE email=?", email).isEmpty())
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
    if (r.password().getBytes(StandardCharsets.UTF_8).length > 72)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Password must be at most 72 UTF-8 bytes");
    db.update(
        "INSERT INTO customers(name,email,password_hash) VALUES(?,?,?)",
        r.name().strip(),
        email,
        passwords.encode(r.password()));
    User user =
        db.queryForObject(
            "SELECT id,name,email FROM customers WHERE email=?",
            (rs, n) -> new User(rs.getLong(1), rs.getString(2), rs.getString(3)),
            email);
    return issue(user);
  }

  public Auth login(Login r) {
    var rows =
        db.queryForList(
            "SELECT * FROM customers WHERE email=?", r.email().strip().toLowerCase(Locale.ROOT));
    String hash = rows.isEmpty() ? dummyHash : (String) rows.get(0).get("password_hash");
    if (r.password().getBytes(StandardCharsets.UTF_8).length > 72
        || !passwords.matches(r.password(), hash)
        || rows.isEmpty())
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    var row = rows.get(0);
    return issue(
        new User(
            ((Number) row.get("id")).longValue(),
            (String) row.get("name"),
            (String) row.get("email")));
  }

  private Auth issue(User user) {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    db.update("DELETE FROM sessions WHERE expires_at < ?", Timestamp.from(Instant.now()));
    db.update(
        "INSERT INTO sessions(token_hash,customer_id,expires_at) VALUES(?,?,?)",
        digest(token),
        user.id(),
        Timestamp.from(Instant.now().plusSeconds(86400)));
    return new Auth(token, user);
  }

  public User require(String authorization) {
    if (authorization == null || !authorization.startsWith("Bearer ")) throw unauthorized();
    var users =
        db.query(
            "SELECT c.id,c.name,c.email FROM customers c JOIN sessions s ON c.id=s.customer_id"
                + " WHERE s.token_hash=? AND s.expires_at>?",
            (rs, n) -> new User(rs.getLong(1), rs.getString(2), rs.getString(3)),
            digest(authorization.substring(7)),
            Timestamp.from(Instant.now()));
    if (users.isEmpty()) throw unauthorized();
    return users.get(0);
  }

  public void logout(String authorization) {
    require(authorization);
    db.update("DELETE FROM sessions WHERE token_hash=?", digest(authorization.substring(7)));
  }

  private ResponseStatusException unauthorized() {
    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in");
  }

  private String digest(String token) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
