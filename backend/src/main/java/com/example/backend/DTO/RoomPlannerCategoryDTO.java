package com.example.backend.DTO;

import java.util.List;

import com.example.backend.model.Category;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RoomPlannerCategoryDTO {
    private String id;
    private String categoryId;
    private String name;
    private String categoryName;
    private String description;
    private List<RoomPlannerProductDTO> products;

    public RoomPlannerCategoryDTO(Category category, List<RoomPlannerProductDTO> products) {
        this.id = category.getCategoryId();
        this.categoryId = category.getCategoryId();
        this.name = category.getCategoryName();
        this.categoryName = category.getCategoryName();
        this.description = category.getDescription();
        this.products = products;
    }
}
