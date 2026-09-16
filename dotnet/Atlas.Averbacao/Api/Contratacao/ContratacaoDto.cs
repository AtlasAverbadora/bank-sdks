using System.ComponentModel.DataAnnotations;

namespace Atlas.Averbacao.Api.Contratacao;

public sealed class ContratacaoRequest
{
    [Required]
    public Guid CorrelacaoId { get; set; }
    [Required]
    public Guid OfertaId { get; set; }
    public Guid? ContratoId { get; set; }
}

public sealed class OkResponse
{
    public bool Ok { get; set; } = true;
}
