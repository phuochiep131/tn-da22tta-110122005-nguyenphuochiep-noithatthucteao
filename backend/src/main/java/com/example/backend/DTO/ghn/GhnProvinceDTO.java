package com.example.backend.DTO.ghn;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GhnProvinceDTO {
    private Integer provinceId;
    private String provinceName;
    private String code;
}
