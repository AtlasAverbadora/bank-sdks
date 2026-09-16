using System.ComponentModel.DataAnnotations;

namespace Atlas.Averbacao.Api.Contrato;

public sealed class ContratoAverbadoRequest
{
    [Required]
    public Guid ContratoId { get; set; }
    public string? Adf { get; set; }
    [Required]
    public string AverbadoEm { get; set; } = "";
}
