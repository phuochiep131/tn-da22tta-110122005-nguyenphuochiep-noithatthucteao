package com.example.backend.DTO.ghn;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GhnDistrictDTO {
    private Integer districtId;
    private Integer provinceId;
    private String districtName;
    private String code;
}
