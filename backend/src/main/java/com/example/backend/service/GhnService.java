package com.example.backend.service;

import com.example.backend.DTO.ghn.GhnDistrictDTO;
import com.example.backend.DTO.ghn.GhnFeeRequest;
import com.example.backend.DTO.ghn.GhnFeeResponse;
import com.example.backend.DTO.ghn.GhnProvinceDTO;
import com.example.backend.DTO.ghn.GhnServiceDTO;
import com.example.backend.DTO.ghn.GhnWardDTO;

import java.util.List;

public interface GhnService {
    List<GhnProvinceDTO> getProvinces();
    List<GhnDistrictDTO> getDistricts(Integer provinceId);
    List<GhnWardDTO> getWards(Integer districtId);
    List<GhnServiceDTO> getAvailableServices(Integer toDistrictId);
    GhnFeeResponse calculateShippingFee(GhnFeeRequest request);
}
