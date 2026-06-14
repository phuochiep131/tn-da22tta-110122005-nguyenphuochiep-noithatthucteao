package com.example.backend.controller;

import com.example.backend.DTO.PayPalRequest;
import com.example.backend.service.PayPalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoint cho luồng thanh toán PayPal (Smart Buttons).
 *  - POST /api/paypal/create-order        : tạo order, trả PayPal orderId cho FE.
 *  - POST /api/paypal/capture-order/{id}  : capture sau khi user duyệt trên popup PayPal.
 *
 * Việc tạo bản ghi Order/Payment trong DB vẫn dùng lại các API có sẵn
 * (/api/orders, /api/payments) — giống hệt luồng VnPay hiện tại — để không
 * trùng lặp logic và không phá vỡ tính năng cũ.
 */
@RestController
@RequestMapping("/api/paypal")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PayPalController {

    private final PayPalService payPalService;

    @PostMapping("/create-order")
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody PayPalRequest request) {
        return ResponseEntity.ok(payPalService.createOrder(request.getAmount()));
    }

    @PostMapping("/capture-order/{orderId}")
    public ResponseEntity<Map<String, Object>> captureOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(payPalService.captureOrder(orderId));
    }
}
