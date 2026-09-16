namespace Atlas.Averbacao.Api;

public class ProblemException : Exception
{
    public int Status { get; }
    public string Title { get; }

    public ProblemException(int status, string title, string detail) : base(detail)
    {
        Status = status;
        Title = title;
    }
}

public class NotImplementedProblem : ProblemException
{
    public NotImplementedProblem(string operation) : base(501, "Not Implemented", operation) { }
}

public class UnauthorizedProblem : ProblemException
{
    public UnauthorizedProblem(string detail) : base(401, "Unauthorized", detail) { }
}
