package com.example.backend.DTO.ghn;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GhnFeeResponse {
    private Integer serviceId;
    private Integer totalFee;
    private Integer serviceFee;
    private Integer insuranceFee;
    private Integer pickStationFee;
    private Integer couponValue;
    private Integer r2sFee;
    private Integer returnFee;
}
