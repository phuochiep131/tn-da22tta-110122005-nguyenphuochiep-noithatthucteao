package com.example.backend.controller;

import com.example.backend.DTO.RoomPlannerCategoryDTO;
import com.example.backend.DTO.RoomPlannerProductDTO;
import com.example.backend.service.CategoryService;
import com.example.backend.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/room-planner")
@CrossOrigin("*")
public class RoomPlannerController {

    private final CategoryService categoryService;
    private final ProductService productService;

    public RoomPlannerController(CategoryService categoryService, ProductService productService) {
        this.categoryService = categoryService;
        this.productService = productService;
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<RoomPlannerCategoryDTO>> getCatalog() {
        Map<String, List<RoomPlannerProductDTO>> productsByCategory = productService.getAllProducts().stream()
                .filter(product -> StringUtils.hasText(product.getArLink()))
                .map(RoomPlannerProductDTO::new)
                .collect(Collectors.groupingBy(
                        RoomPlannerProductDTO::getCategoryId,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<RoomPlannerCategoryDTO> catalog = categoryService.getAllCategories().stream()
                .map(category -> new RoomPlannerCategoryDTO(
                        category,
                        productsByCategory.getOrDefault(category.getCategoryId(), List.of())
                ))
                .filter(category -> !category.getProducts().isEmpty())
                .collect(Collectors.toList());

        return ResponseEntity.ok(catalog);
    }
}
