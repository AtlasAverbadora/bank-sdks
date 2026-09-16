using System.Text;
using Atlas.Averbacao.Api;

namespace Atlas.Averbacao.Security;

public sealed class AtlasAuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, IdentityState identity, ReplayCache replay)
    {
        var path = ctx.Request.Path.Value ?? "";
        if (Publica(ctx.Request.Method, path))
        {
            await next(ctx);
            return;
        }

        ctx.Request.EnableBuffering();
        using var reader = new StreamReader(ctx.Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        ctx.Request.Body.Position = 0;

        if (identity.Current is null)
            throw new UnauthorizedProblem("não pareado");

        var headers = ctx.Request.Headers.ToDictionary(
            h => h.Key,
            h => h.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);

        HttpSignatures.VerifyRequest(ctx.Request.Method, path, body, headers, identity.Current.AtlasPublicKey, replay);
        await next(ctx);
    }

    private static bool Publica(string method, string path)
    {
        if (method == "GET" && path == "/v1/saude") return true;
        if (path == "/docs" || path.StartsWith("/docs/", StringComparison.Ordinal)) return true;
        return false;
    }
}
