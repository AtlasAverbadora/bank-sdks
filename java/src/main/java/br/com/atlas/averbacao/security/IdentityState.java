package br.com.atlas.averbacao.security;

import org.springframework.stereotype.Component;

@Component
public class IdentityState {
    private volatile Identity current;

    public Identity current() { return current; }
    public void setCurrent(Identity current) { this.current = current; }
}
