package br.com.atlas.averbacao.api;

public class NotImplementedProblem extends ProblemException {
    public NotImplementedProblem(String operation) {
        super(501, "Not Implemented", operation);
    }
}
