using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Atlas.Averbacao.Api.Ofertas;

public sealed class OfertasRequest
{
    [Required]
    public Guid CorrelacaoId { get; set; }
    [Required]
    public ConvenioDto Convenio { get; set; } = new();
    [Required]
    public ServidorDto Servidor { get; set; } = new();
    [Required]
    public MargemDto Margem { get; set; } = new();
    [Required]
    public SolicitacaoDto Solicitacao { get; set; } = new();
}

public sealed class ConvenioDto
{
    public int Id { get; set; }
    [Required]
    public string Codigo { get; set; } = "";
    public int PrazoMaximoMeses { get; set; }
    public double TaxaTetoAm { get; set; }
}

public sealed class ServidorDto
{
    [Required, RegularExpression(@"^\d{11}$")]
    public string Cpf { get; set; } = "";
    [Required]
    public string Matricula { get; set; } = "";
    [Required]
    public string Vinculo { get; set; } = "";
    [Required]
    public string SituacaoFuncional { get; set; } = "";
    public string? DataAdmissao { get; set; }
    public string? DataNascimento { get; set; }
}

public sealed class MargemDto
{
    [Required]
    public string Tipo { get; set; } = "";
    public double Disponivel { get; set; }
    public double Total { get; set; }
}

public sealed class SolicitacaoDto
{
    public double? ValorDesejado { get; set; }
    public int? PrazoDesejado { get; set; }
}

public sealed class Oferta
{
    [Required]
    public string ReferenciaBanco { get; set; } = "";
    public double ValorFinanciado { get; set; }
    public double ValorLiquido { get; set; }
    public double ValorParcela { get; set; }
    public int PrazoMeses { get; set; }
    public double TaxaAm { get; set; }
    public double CetAm { get; set; }
    public double? ValorIof { get; set; }
    public string? Jws { get; set; }
}

public sealed class OfertasResponse
{
    public int ValidadeSegundos { get; set; } = 300;
    public List<Oferta> Ofertas { get; set; } = [];
}

public sealed class OfertaUnsigned
{
    [JsonPropertyName("referencia_banco")]
    public string ReferenciaBanco { get; set; } = "";
    [JsonPropertyName("valor_financiado")]
    public double ValorFinanciado { get; set; }
    [JsonPropertyName("valor_liquido")]
    public double ValorLiquido { get; set; }
    [JsonPropertyName("valor_parcela")]
    public double ValorParcela { get; set; }
    [JsonPropertyName("prazo_meses")]
    public int PrazoMeses { get; set; }
    [JsonPropertyName("taxa_am")]
    public double TaxaAm { get; set; }
    [JsonPropertyName("cet_am")]
    public double CetAm { get; set; }
    [JsonPropertyName("valor_iof")]
    public double? ValorIof { get; set; }
}
