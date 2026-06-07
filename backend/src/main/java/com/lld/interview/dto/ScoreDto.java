package com.lld.interview.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ScoreDto {
    private int clarity;
    private int oopDesign;
    private int patterns;
    private int edgeCases;
    private int overall;
}
