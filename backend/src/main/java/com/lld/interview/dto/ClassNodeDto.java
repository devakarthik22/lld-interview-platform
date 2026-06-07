package com.lld.interview.dto;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ClassNodeDto {
    private String name;
    private String type;   // class | interface | abstract | enum
    private List<String> members;
}
