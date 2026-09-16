package br.com.atlas.averbacao.api;

public class ProblemException extends RuntimeException {
    private final int status;
    private final String title;

    public ProblemException(int status, String title, String detail) {
        super(detail);
        this.status = status;
        this.title = title;
    }

    public int status() { return status; }
    public String title() { return title; }
}
