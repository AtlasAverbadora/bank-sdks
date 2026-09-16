package br.com.atlas.averbacao.security;

import br.com.atlas.averbacao.api.UnauthorizedProblem;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class AtlasAuthFilter extends OncePerRequestFilter {
    private final IdentityState identity;
    private final ReplayCache replay;

    public AtlasAuthFilter(IdentityState identity, ReplayCache replay) {
        this.identity = identity;
        this.replay = replay;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if ("GET".equals(request.getMethod()) && "/v1/saude".equals(path)) return true;
        return "/docs".equals(path) || path.startsWith("/docs/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        CachedBodyRequest wrapped = request instanceof CachedBodyRequest c ? c : new CachedBodyRequest(request);
        try {
            Identity current = identity.current();
            if (current == null) throw new UnauthorizedProblem("não pareado");
            Map<String, String> headers = new LinkedHashMap<>();
            Collections.list(wrapped.getHeaderNames()).forEach(name -> headers.put(name, wrapped.getHeader(name)));
            HttpSignatures.verifyRequest(wrapped.getMethod(), wrapped.getRequestURI(), wrapped.bodyUtf8(), headers, current.atlasPublicKey(), replay);
        } catch (UnauthorizedProblem ex) {
            response.setStatus(ex.status());
            response.setContentType("application/problem+json;charset=UTF-8");
            response.getWriter().write(
                "{\"type\":\"about:blank\",\"title\":\"" + ex.title() + "\",\"status\":" + ex.status()
                    + ",\"detail\":\"" + ex.getMessage().replace("\"", "'") + "\"}");
            return;
        }
        chain.doFilter(wrapped, response);
    }
}
