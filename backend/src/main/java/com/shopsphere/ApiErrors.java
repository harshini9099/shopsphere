package com.shopsphere;

import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
  public record Error(String message, Map<String, String> fields) {}

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Error> business(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(new Error(e.getReason(), Map.of()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Error> validation(MethodArgumentNotValidException e) {
    Map<String, String> fields = new LinkedHashMap<>();
    e.getBindingResult()
        .getFieldErrors()
        .forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
    return ResponseEntity.badRequest().body(new Error("Please check the submitted fields", fields));
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class
  })
  ResponseEntity<Error> malformed(Exception e) {
    return ResponseEntity.badRequest().body(new Error("Invalid request format", Map.of()));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Error> conflict(DataIntegrityViolationException e) {
    return ResponseEntity.status(409)
        .body(new Error("The request conflicts with existing data", Map.of()));
  }
}
