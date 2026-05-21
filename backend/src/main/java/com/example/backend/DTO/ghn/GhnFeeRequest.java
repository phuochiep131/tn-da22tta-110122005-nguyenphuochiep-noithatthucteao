package com.example.backend.DTO.ghn;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GhnFeeRequest {
    @NotNull
    @Min(1)
    private Integer toDistrictId;

    @NotBlank
    private String toWardCode;

    private Integer serviceId;
    private Integer height;
    private Integer length;
    private Integer weight;
    private Integer width;
    private Integer insuranceValue;
}
