package com.example.backend.DTO.ghn;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GhnServiceDTO {
    private Integer serviceId;
    private Integer serviceTypeId;
    private String shortName;
}
