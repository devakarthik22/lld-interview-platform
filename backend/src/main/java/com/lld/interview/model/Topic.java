package com.lld.interview.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Topic {
    private String id;
    private String name;
    private String category;
    private String difficulty;   // easy | medium | hard
    private String description;
    private List<String> tags;
    private String icon;
}
