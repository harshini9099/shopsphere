package com.shopsphere;

import static com.shopsphere.Models.*;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ShopService {
  private final JdbcTemplate db;
  private final RowMapper<Product> productMapper =
      (r, n) ->
          new Product(
              r.getLong("id"),
              r.getString("name"),
              r.getString("description"),
              r.getString("category"),
              r.getBigDecimal("price"),
              r.getString("icon"));

  public ShopService(JdbcTemplate db) {
    this.db = db;
  }

  public List<Product> products(String search, String category, String sort) {
    String ordering =
        switch (sort) {
          case "price-asc" -> "price ASC,id";
          case "price-desc" -> "price DESC,id";
          case "name" -> "name,id";
          default ->
              throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown sort option");
        };
    // Parameters protect input; the ORDER BY clause uses a closed allow-list.
    return db.query(
        "SELECT * FROM products WHERE LOWER(name) LIKE ? AND (?='' OR category=?) ORDER BY "
            + ordering,
        productMapper,
        "%" + search.toLowerCase(Locale.ROOT) + "%",
        category,
        category);
  }

  public Product product(long id) {
    var rows = db.query("SELECT * FROM products WHERE id=?", productMapper, id);
    if (rows.isEmpty())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
    return rows.get(0);
  }

  public Cart cart(long user) {
    var items =
        db.query(
            "SELECT p.*,c.quantity FROM cart_items c JOIN products p ON p.id=c.product_id WHERE"
                + " customer_id=? ORDER BY p.id",
            (rs, n) -> {
              Product p = productMapper.mapRow(rs, n);
              int q = rs.getInt("quantity");
              return new CartItem(p, q, p.price().multiply(BigDecimal.valueOf(q)));
            },
            user);
    return new Cart(
        items,
        items.stream().map(CartItem::subtotal).reduce(new BigDecimal("0.00"), BigDecimal::add));
  }

  // Every cart mutation and checkout locks the same customer row. Concurrent requests
  // cannot lose updates or purchase the same cart twice.
  private void lockCustomer(long user) {
    db.queryForObject("SELECT id FROM customers WHERE id=? FOR UPDATE", Long.class, user);
  }

  @Transactional
  public Cart setQuantity(long user, long productId, int quantity) {
    lockCustomer(user);
    product(productId);
    int changed =
        db.update(
            "UPDATE cart_items SET quantity=? WHERE customer_id=? AND product_id=?",
            quantity,
            user,
            productId);
    if (changed == 0)
      db.update(
          "INSERT INTO cart_items(customer_id,product_id,quantity) VALUES(?,?,?)",
          user,
          productId,
          quantity);
    return cart(user);
  }

  @Transactional
  public Cart remove(long user, long productId) {
    lockCustomer(user);
    db.update("DELETE FROM cart_items WHERE customer_id=? AND product_id=?", user, productId);
    return cart(user);
  }

  @Transactional
  public Order checkout(long user, Checkout c) {
    lockCustomer(user);
    Cart cart = cart(user);
    if (cart.items().isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Your cart is empty");
    if (c.payment().equals("DECLINED"))
      throw new ResponseStatusException(
          HttpStatus.PAYMENT_REQUIRED, "Mock payment declined. Your cart has been kept.");
    String id = UUID.randomUUID().toString();
    db.update(
        "INSERT INTO"
            + " orders(id,customer_id,placed_at,total,shipping_name,address,city,postal_code,status)"
            + " VALUES(?,?,?,?,?,?,?,?,?)",
        id,
        user,
        Timestamp.from(Instant.now()),
        cart.total(),
        c.name().strip(),
        c.address().strip(),
        c.city().strip(),
        c.postalCode().strip(),
        "CONFIRMED");
    for (CartItem item : cart.items())
      db.update(
          "INSERT INTO order_items(order_id,product_id,name,unit_price,quantity) VALUES(?,?,?,?,?)",
          id,
          item.product().id(),
          item.product().name(),
          item.product().price(),
          item.quantity());
    db.update("DELETE FROM cart_items WHERE customer_id=?", user);
    return order(user, id);
  }

  public List<Order> orders(long user) {
    return db
        .queryForList(
            "SELECT id FROM orders WHERE customer_id=? ORDER BY placed_at DESC,id",
            String.class,
            user)
        .stream()
        .map(id -> order(user, id))
        .toList();
  }

  public Order order(long user, String id) {
    var items =
        db.query(
            "SELECT product_id,name,unit_price,quantity FROM order_items WHERE order_id=? ORDER BY"
                + " id",
            (rs, n) ->
                new OrderItem(rs.getLong(1), rs.getString(2), rs.getBigDecimal(3), rs.getInt(4)),
            id);
    var orders =
        db.query(
            "SELECT * FROM orders WHERE id=? AND customer_id=?",
            (rs, n) ->
                new Order(
                    rs.getString("id"),
                    rs.getTimestamp("placed_at").toInstant().toString(),
                    rs.getBigDecimal("total"),
                    rs.getString("shipping_name"),
                    rs.getString("address"),
                    rs.getString("city"),
                    rs.getString("postal_code"),
                    rs.getString("status"),
                    items),
            id,
            user);
    if (orders.isEmpty())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
    return orders.get(0);
  }
}
