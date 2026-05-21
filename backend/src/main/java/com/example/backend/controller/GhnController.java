package com.example.backend.controller;

import com.example.backend.DTO.ghn.GhnDistrictDTO;
import com.example.backend.DTO.ghn.GhnFeeRequest;
import com.example.backend.DTO.ghn.GhnFeeResponse;
import com.example.backend.DTO.ghn.GhnProvinceDTO;
import com.example.backend.DTO.ghn.GhnServiceDTO;
import com.example.backend.DTO.ghn.GhnWardDTO;
import com.example.backend.exception.GhnApiException;
import com.example.backend.service.GhnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ghn")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class GhnController {

    private final GhnService ghnService;

    @GetMapping("/provinces")
    public List<GhnProvinceDTO> getProvinces() {
        return ghnService.getProvinces();
    }

    @GetMapping("/districts")
    public List<GhnDistrictDTO> getDistricts(@RequestParam Integer provinceId) {
        return ghnService.getDistricts(provinceId);
    }

    @GetMapping("/wards")
    public List<GhnWardDTO> getWards(@RequestParam Integer districtId) {
        return ghnService.getWards(districtId);
    }

    @GetMapping("/available-services")
    public List<GhnServiceDTO> getAvailableServices(@RequestParam Integer toDistrictId) {
        return ghnService.getAvailableServices(toDistrictId);
    }

    @PostMapping("/fee")
    public GhnFeeResponse calculateShippingFee(@Valid @RequestBody GhnFeeRequest request) {
        return ghnService.calculateShippingFee(request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid GHN request payload"));
    }

    @ExceptionHandler(GhnApiException.class)
    public ResponseEntity<Map<String, String>> handleGhnError(GhnApiException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("message", ex.getMessage()));
    }
}
