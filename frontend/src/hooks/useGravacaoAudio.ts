import { useRef, useState } from "react";
import { ApiError, iaApi } from "../lib/api";

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Grava áudio do microfone e transcreve via IA — extraído do cadastro de
 * catálogo por voz (Produtos) para ser reaproveitado em qualquer lugar do
 * MOVA que precise da mesma capacidade (ex.: Perfil Operacional), sem manter
 * duas implementações independentes da mesma gravação/transcrição.
 */
export function useGravacaoAudio(aoTranscrever: (texto: string) => void) {
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function iniciarGravacao() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (evento) => chunksRef.current.push(evento.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setTranscrevendo(true);
        try {
          const base64 = await blobParaBase64(blob);
          const { texto: transcrito } = await iaApi.transcreverAudio(base64, blob.type || "audio/webm");
          aoTranscrever(transcrito);
        } catch (e) {
          setErro(e instanceof ApiError ? e.message : "Não foi possível transcrever o áudio.");
        } finally {
          setTranscrevendo(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setGravando(true);
    } catch {
      setErro("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop();
    setGravando(false);
  }

  return { gravando, transcrevendo, erro, limparErro: () => setErro(null), iniciarGravacao, pararGravacao };
}
