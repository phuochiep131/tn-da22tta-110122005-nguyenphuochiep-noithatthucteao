package com.example.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "ghn")
public class GhnProperties {
    private String baseUrl = "https://online-gateway.ghn.vn/shiip/public-api";
    private String token = "";
    private Integer shopId = 0;
    private Integer fromDistrictId = 1454;
    private Integer defaultHeight = 20;
    private Integer defaultLength = 20;
    private Integer defaultWidth = 20;
    private Integer defaultWeight = 1000;
    private Integer defaultInsuranceValue = 0;
    private Integer retryAttempts = 2;
}
