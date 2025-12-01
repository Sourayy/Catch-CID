let cidsGlobal = [];
let isLoading = false;
const cidInput = document.getElementById("cid");
const botao = document.querySelector(".botao-formulario");
const data = document.getElementById("data").value;

function addCounter(textareaId) {
  const textarea = document.getElementById(textareaId);
  const container = textarea.parentElement;

  function atualizar() {
    const length = textarea.value.length;
    container.setAttribute("data-count", `${length}/400`);
  }

  textarea.addEventListener("input", atualizar);
  atualizar();
}

addCounter("sintomas");
addCounter("tratamento");

cidInput.addEventListener("focus", () => {
  cidInput.value = "";
});

async function carregarCIDs() {
  try {
    const response = await fetch("./IA/cids_completos.csv");
    const texto = await response.text();

    const linhas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    linhas.shift();

    cidsGlobal = linhas.map((linha) => {
      const partes = linha.split(";");
      return {
        codigo: partes[0],
        descricao: partes[1],
        sintomas: partes[2] || "",
      };
    });

    const datalist = document.getElementById("cids-datalist");

    cidsGlobal.forEach((cid) => {
      const option = document.createElement("option");
      option.value = `${cid.codigo} - ${cid.descricao}`;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar CSV:", error);
  }
}

async function enviarFormulario(event) {
  event.preventDefault();

  isLoading = true;
  botao.disabled = true;
  botao.textContent = "ENVIANDO...";

  const paciente = document.getElementById("paciente").value.trim();
  const idade = document.getElementById("idade").value.trim();
  const data = document.getElementById("data").value;
  const sintomas = document.getElementById("sintomas").value.trim();
  const cidTexto = document.getElementById("cid").value.trim();
  const tratamento = document.getElementById("tratamento").value.trim();

  if (!validarData(data)) {
    mostrarFeedback("erro", "Data inválida");
    return;
  }

  const cidEscolhido = cidTexto.split(" - ")[0].trim();

  const cidRecomendado = await validarCIDviaModelo(sintomas);

  if (cidEscolhido !== cidRecomendado) {
    mostrarFeedback("erro", "CID incorreto");
    return;
  }

  const dadosFormulario = {
    paciente,
    idade,
    data,
    sintomas,
    cid: cidEscolhido,
    tratamento,
  };

  mostrarFeedback("sucesso", dadosFormulario.paciente);
}

document.addEventListener("DOMContentLoaded", () => {
  carregarCIDs();

  const form = document.getElementById("prontuario");
  form.addEventListener("submit", enviarFormulario);

  const inputFile = document.getElementById("csvFile");
  if (inputFile) {
    inputFile.addEventListener("change", (e) => {
      const arquivo = e.target.files[0];
      if (arquivo) {
        lerCSV(arquivo, (dados) => {
          console.log("Conteúdo do CSV:", dados);
        });
      }
    });
  }
});

function mostrarFeedback(tipo, valor) {
  const balao = document.getElementById("balao-feedback");
  const mensagem = document.getElementById("mensagem-feedback");

  if (tipo === "sucesso") {
    mensagem.textContent = `✅ O usuário ${valor} foi cadastrado com sucesso!`;
    balao.style.backgroundColor = "#c8f7c5";
  } else if (tipo === "erro") {
    mensagem.textContent = `❌ ${valor}`;
    balao.style.backgroundColor = "#f7c5c5";
  }

  balao.style.display = "inline-block";

  setTimeout(() => {
    balao.style.display = "none";
  }, 4000);

  isLoading = false;
  botao.disabled = false;
  botao.textContent = "ENVIAR";
}

async function validarCIDviaModelo(sintomas) {
  try {
    const resposta = await fetch(
      "http://localhost:5000/inferir?consulta=" + encodeURIComponent(sintomas)
    );

    if (!resposta.ok) {
      console.error("Erro HTTP:", resposta.status);
      return null;
    }

    const dados = await resposta.json();
    return dados["Código CID"];
  } catch (erro) {
    console.error("ERRO NO FETCH:", erro);
    return null;
  }
}

function validarData(dataString) {
  if (!dataString) return false;

  const data = new Date(dataString);
  const hoje = new Date();

  if (isNaN(data.getTime())) return false;

  const anoAtual = hoje.getFullYear();

  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const dia = data.getDate();

  if (ano !== anoAtual) return false;

  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > 31) return false;

  if ([4, 5, 9, 11].includes(mes) && dia > 30) return false;

  const anoBissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  if (mes === 2) {
    if (anoBissexto && dia > 29) return false;
    if (!anoBissexto && dia > 28) return false;
  }

  if (data > hoje) return false;

  return true;
}
