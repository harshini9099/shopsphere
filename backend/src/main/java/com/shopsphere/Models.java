package com.shopsphere;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/** API contracts are explicit records: database rows never expose password hashes. */
public final class Models {
  private Models() {}

  public record Registration(
      @NotBlank @Size(max = 80) String name,
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(min = 8, max = 64) String password) {}

  public record Login(
      @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 64) String password) {}

  public record User(long id, String name, String email) {}

  public record Auth(String token, User user) {}

  public record Product(
      long id, String name, String description, String category, BigDecimal price, String icon) {}

  public record Quantity(@Min(1) @Max(99) int quantity) {}

  public record CartItem(Product product, int quantity, BigDecimal subtotal) {}

  public record Cart(List<CartItem> items, BigDecimal total) {}

  public record Checkout(
      @NotBlank @Size(max = 80) String name,
      @NotBlank @Size(max = 200) String address,
      @NotBlank @Size(max = 80) String city,
      @NotBlank @Size(max = 20) String postalCode,
      @NotBlank @Pattern(regexp = "APPROVED|DECLINED") String payment) {}

  public record OrderItem(long productId, String name, BigDecimal unitPrice, int quantity) {}

  public record Order(
      String id,
      String placedAt,
      BigDecimal total,
      String name,
      String address,
      String city,
      String postalCode,
      String status,
      List<OrderItem> items) {}
}
