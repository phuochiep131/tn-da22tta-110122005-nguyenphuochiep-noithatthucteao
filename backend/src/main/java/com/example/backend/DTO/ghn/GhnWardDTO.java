package com.example.backend.DTO.ghn;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GhnWardDTO {
    private String wardCode;
    private Integer districtId;
    private String wardName;
}
