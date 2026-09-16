package br.com.atlas.averbacao.api;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ProblemAdvice {
    @ExceptionHandler(ProblemException.class)
    public ResponseEntity<Map<String, Object>> problem(ProblemException ex) {
        return ResponseEntity.status(ex.status())
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .body(body(ex.status(), ex.title(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest()
            .contentType(MediaType.parseMediaType("application/problem+json"))
            .body(body(400, "Bad Request", "corpo fora do schema"));
    }

    static Map<String, Object> body(int status, String title, String detail) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "about:blank");
        m.put("title", title);
        m.put("status", status);
        m.put("detail", detail);
        return m;
    }
}
