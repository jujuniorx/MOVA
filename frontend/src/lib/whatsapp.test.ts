import { describe, expect, it } from "vitest";
import { montarLinkChat, montarLinkCompartilhamento, montarLinkWhatsappTexto } from "./whatsapp";

describe("montarLinkChat", () => {
  it("sem número, abre o WhatsApp sem destinatário fixo", () => {
    expect(montarLinkChat(null)).toBe("https://wa.me/");
    expect(montarLinkChat(undefined)).toBe("https://wa.me/");
    expect(montarLinkChat("")).toBe("https://wa.me/");
  });

  it("número nacional simples (DDD comum) recebe o DDI 55", () => {
    expect(montarLinkChat("11988887777")).toBe("https://wa.me/5511988887777");
  });

  it("remove formatação — parênteses, espaço e hífen", () => {
    expect(montarLinkChat("(11) 98888-7777")).toBe("https://wa.me/5511988887777");
  });

  it("telefone fixo (10 dígitos) também recebe o DDI", () => {
    expect(montarLinkChat("1133224455")).toBe("https://wa.me/551133224455");
  });

  // Caso real do bug relatado: DDD 55 (Santa Maria/RS e região) faz um
  // número NACIONAL legítimo começar com "55" — sem o tamanho como critério,
  // isso era confundido com "já tem DDI" e o 55 do país nunca era somado.
  it("DDD 55 sem DDI é reconhecido como nacional, não como 'já tem DDI'", () => {
    expect(montarLinkChat("55988887777")).toBe("https://wa.me/5555988887777");
  });

  it("número já com DDI (13 dígitos, DDD comum) não duplica o 55", () => {
    expect(montarLinkChat("5511988887777")).toBe("https://wa.me/5511988887777");
  });

  it("número já com DDI e DDD 55 (13 dígitos) não duplica o 55", () => {
    expect(montarLinkChat("5555988887777")).toBe("https://wa.me/5555988887777");
  });

  it("fixo já com DDI (12 dígitos) não duplica o 55", () => {
    expect(montarLinkChat("551133224455")).toBe("https://wa.me/551133224455");
  });

  it("aceita '+' na frente (formato internacional digitado manualmente)", () => {
    expect(montarLinkChat("+55 11 98888-7777")).toBe("https://wa.me/5511988887777");
  });

  it("telefone incompleto/inválido (poucos dígitos) cai no link sem destinatário", () => {
    expect(montarLinkChat("(11")).toBe("https://wa.me/");
    expect(montarLinkChat("119")).toBe("https://wa.me/");
  });

  it("sequência de dígitos absurdamente longa cai no link sem destinatário", () => {
    expect(montarLinkChat("551198888777712345")).toBe("https://wa.me/");
  });
});

describe("montarLinkWhatsappTexto", () => {
  it("inclui o texto codificado na querystring", () => {
    const link = montarLinkWhatsappTexto("11988887777", "Olá, tudo bem?");
    expect(link).toBe("https://wa.me/5511988887777?text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });

  it("sem número, ainda assim inclui o texto", () => {
    const link = montarLinkWhatsappTexto(null, "oi");
    expect(link).toBe("https://wa.me/?text=oi");
  });
});

describe("montarLinkCompartilhamento", () => {
  it("prioriza o whatsapp do cliente sobre o telefone", () => {
    const link = montarLinkCompartilhamento({
      nomeCliente: "Maria",
      nomeEmpresa: "Regusto",
      total: "150.5",
      link: "https://mova.tec.br/o/1",
      whatsappCliente: "11988887777",
      telefoneCliente: "1133224455",
    });
    expect(link.startsWith("https://wa.me/5511988887777?text=")).toBe(true);
  });

  it("usa o telefone quando não há whatsapp cadastrado", () => {
    const link = montarLinkCompartilhamento({
      nomeCliente: "Maria",
      nomeEmpresa: "Regusto",
      total: "150.5",
      link: "https://mova.tec.br/o/1",
      whatsappCliente: null,
      telefoneCliente: "1133224455",
    });
    expect(link.startsWith("https://wa.me/551133224455?text=")).toBe(true);
  });

  it("whatsapp cadastrado incompleto ignora e usa o telefone válido", () => {
    const link = montarLinkCompartilhamento({
      nomeCliente: "Maria",
      nomeEmpresa: "Regusto",
      total: "150.5",
      link: "https://mova.tec.br/o/1",
      whatsappCliente: "(11",
      telefoneCliente: "1133224455",
    });
    expect(link.startsWith("https://wa.me/551133224455?text=")).toBe(true);
  });

  it("sem nenhum contato, abre sem destinatário fixo mas mantém a mensagem", () => {
    const link = montarLinkCompartilhamento({
      nomeCliente: "Maria",
      nomeEmpresa: "Regusto",
      total: "150.5",
      link: "https://mova.tec.br/o/1",
      whatsappCliente: null,
      telefoneCliente: null,
    });
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
  });
});
