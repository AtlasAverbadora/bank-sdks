package br.com.atlas.averbacao.api;

public class UnauthorizedProblem extends ProblemException {
    public UnauthorizedProblem(String detail) {
        super(401, "Unauthorized", detail);
    }
}
