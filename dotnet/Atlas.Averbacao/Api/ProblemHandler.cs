using Atlas.Averbacao.Api;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Averbacao.Api;

public static class ProblemHandler
{
    public static IResult From(Exception error)
    {
        if (error is ProblemException p)
        {
            return Results.Json(new
            {
                type = "about:blank",
                title = p.Title,
                status = p.Status,
                detail = p.Message,
            }, statusCode: p.Status, contentType: "application/problem+json");
        }
        return Results.Json(new
        {
            type = "about:blank",
            title = "Internal Server Error",
            status = 500,
            detail = "erro interno",
        }, statusCode: 500, contentType: "application/problem+json");
    }

    public static IResult Validation(ActionContext ctx)
    {
        return Results.Json(new
        {
            type = "about:blank",
            title = "Bad Request",
            status = 400,
            detail = "corpo fora do schema",
            errors = ctx.ModelState
                .Where(kv => kv.Value is { Errors.Count: > 0 })
                .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray()),
        }, statusCode: 400, contentType: "application/problem+json");
    }
}
