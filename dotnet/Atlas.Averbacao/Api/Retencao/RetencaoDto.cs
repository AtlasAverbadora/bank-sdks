using System.ComponentModel.DataAnnotations;

namespace Atlas.Averbacao.Api.Retencao;

public sealed class RetencaoOportunidadeRequest
{
    [Required]
    public Guid OportunidadeId { get; set; }
    public Guid? ContratoId { get; set; }
    [Required]
    public string Matricula { get; set; } = "";
    [Required]
    public string ExpiraEm { get; set; } = "";
}
