package com.shopsphere;

import static com.shopsphere.Models.*;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ApiController {
  private final AuthService auth;
  private final ShopService shop;

  public ApiController(AuthService auth, ShopService shop) {
    this.auth = auth;
    this.shop = shop;
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "UP");
  }

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  public Auth register(@Valid @RequestBody Registration body) {
    return auth.register(body);
  }

  @PostMapping("/auth/login")
  public Auth login(@Valid @RequestBody Login body) {
    return auth.login(body);
  }

  @GetMapping("/auth/me")
  public User me(@RequestHeader(value = "Authorization", required = false) String h) {
    return auth.require(h);
  }

  @PostMapping("/auth/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(@RequestHeader(value = "Authorization", required = false) String h) {
    auth.logout(h);
  }

  @GetMapping("/products")
  public List<Product> products(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "") String category,
      @RequestParam(defaultValue = "name") String sort) {
    return shop.products(search, category, sort);
  }

  @GetMapping("/products/{id}")
  public Product product(@PathVariable long id) {
    return shop.product(id);
  }

  @GetMapping("/cart")
  public Cart cart(@RequestHeader(value = "Authorization", required = false) String h) {
    return shop.cart(auth.require(h).id());
  }

  @PutMapping("/cart/items/{id}")
  public Cart quantity(
      @RequestHeader(value = "Authorization", required = false) String h,
      @PathVariable long id,
      @Valid @RequestBody Quantity q) {
    return shop.setQuantity(auth.require(h).id(), id, q.quantity());
  }

  @DeleteMapping("/cart/items/{id}")
  public Cart remove(
      @RequestHeader(value = "Authorization", required = false) String h, @PathVariable long id) {
    return shop.remove(auth.require(h).id(), id);
  }

  @PostMapping("/orders")
  @ResponseStatus(HttpStatus.CREATED)
  public Order checkout(
      @RequestHeader(value = "Authorization", required = false) String h,
      @Valid @RequestBody Checkout c) {
    return shop.checkout(auth.require(h).id(), c);
  }

  @GetMapping("/orders")
  public List<Order> orders(@RequestHeader(value = "Authorization", required = false) String h) {
    return shop.orders(auth.require(h).id());
  }

  @GetMapping("/orders/{id}")
  public Order order(
      @RequestHeader(value = "Authorization", required = false) String h, @PathVariable String id) {
    return shop.order(auth.require(h).id(), id);
  }
}
