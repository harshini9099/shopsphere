package com.shopsphere;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
      "spring.datasource.username=sa",
      "spring.datasource.password="
    })
@AutoConfigureMockMvc
class ShopIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  private String register() throws Exception {
    String result =
        mvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"name\":\"Test\",\"email\":\""
                            + UUID.randomUUID()
                            + "@example.test\",\"password\":\"Password123!\"}"))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return "Bearer " + json.readTree(result).get("token").asText();
  }

  @Test
  void checkoutIsAtomicAndServerPriced() throws Exception {
    String token = register();
    mvc.perform(
            put("/api/cart/items/1")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":2}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(159.98));
    String body =
        "{\"name\":\"Test\",\"address\":\"123 Demo"
            + " St\",\"city\":\"Seattle\",\"postalCode\":\"98101\",\"payment\":\"DECLINED\"}";
    mvc.perform(
            post("/api/orders")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isPaymentRequired());
    mvc.perform(get("/api/cart").header("Authorization", token))
        .andExpect(jsonPath("$.items.length()").value(1));
    String result =
        mvc.perform(
                post("/api/orders")
                    .header("Authorization", token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body.replace("DECLINED", "APPROVED")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.total").value(159.98))
            .andReturn()
            .getResponse()
            .getContentAsString();
    String id = json.readTree(result).get("id").asText();
    mvc.perform(get("/api/orders/" + id).header("Authorization", register()))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/cart").header("Authorization", token))
        .andExpect(jsonPath("$.items.length()").value(0));
  }

  @Test
  void validatesAndRevokesSessions() throws Exception {
    mvc.perform(get("/api/cart")).andExpect(status().isUnauthorized());
    String token = register();
    mvc.perform(
            put("/api/cart/items/1")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":0}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.quantity").exists());
    mvc.perform(post("/api/auth/logout").header("Authorization", token))
        .andExpect(status().isNoContent());
    mvc.perform(get("/api/cart").header("Authorization", token))
        .andExpect(status().isUnauthorized());
  }
}
