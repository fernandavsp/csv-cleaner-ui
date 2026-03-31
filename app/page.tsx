"use client";

import { useState, useRef } from "react";

type ProcessStats = {
  rows_before: number;
  rows_after: number;
  rows_removed: number;
  cells_trimmed?: number;
  empty_removed?: number;
  dates_changed?: number;
  dates_invalid?: number;
  dates_checked?: number;
  date_format?: string;
  preview?: string[][];
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [stats, setStats] = useState<ProcessStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBrazilianDateFormat, setUseBrazilianDateFormat] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  const previewHeader = preview[0] ?? [];
  const previewRows = preview.slice(1, 11);
  const previewRecordCount = Math.max(preview.length - 1, 0);
  const beforeRecords = stats ? Math.max(stats.rows_before - 1, 0) : 0;
  const afterRecords = stats ? Math.max(stats.rows_after - 1, 0) : 0;
  const removedRecords = Math.max(beforeRecords - afterRecords, 0);
  const datesChecked = stats?.dates_checked ?? 0;
  const datesInvalid = stats?.dates_invalid ?? 0;
  const datesValid = Math.max(datesChecked - datesInvalid, 0);
  const datesChanged = stats?.dates_changed ?? 0;
  const invalidRate = datesChecked > 0 ? Math.round((datesInvalid / datesChecked) * 100) : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview([]);
    setStats(null);
    setFileId(null);
    setError(null);
    setUseBrazilianDateFormat(false);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selected);

      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const isJSON = res.headers.get("content-type")?.includes("application/json");
      const data = isJSON ? await res.json() : {};

      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar o arquivo.");
        return;
      }

      setFileId(data.file_id);
      setPreview(data.preview);
    } catch {
      setError("Não foi possível conectar com a API. Verifique se o backend está ativo.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!fileId) return;
    setLoading(true);
    setError(null);

    try {
      const dateFormat = useBrazilianDateFormat ? "br" : "none";
      const params = new URLSearchParams({ file_id: fileId, date_format: dateFormat });
      const res = await fetch(`${API_URL}/process?${params.toString()}`, {
        method: "POST",
      });

      const isJSON = res.headers.get("content-type")?.includes("application/json");
      const data = isJSON ? await res.json() : {};

      if (!res.ok) {
        setError(data.error ?? "Não foi possível processar o arquivo.");
        return;
      }

      setStats(data);
      if (Array.isArray(data.preview)) {
        setPreview(data.preview);
      }
    } catch {
      setError("Não foi possível conectar com a API. Verifique se o backend está ativo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fileId) return;
    window.open(`${API_URL}/download?file_id=${fileId}&t=${Date.now()}`, "_blank");
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-2xl shadow-xl">
        
        {/* Header */}
        <h1 className="text-2xl font-bold mb-2">
          Limpeza de CSV para dados confiáveis
        </h1>
        <p className="text-gray-400 text-sm mb-5">
          Envie seu arquivo para remover duplicidades, linhas vazias e espaços extras em segundos.
        </p>

        {/* Hidden input */}
        <input
          type="file"
          accept=".csv,.tsv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Area */}
        <div
          onClick={openFileSelector}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-4 cursor-pointer hover:bg-gray-50 transition"
        >
          <p className="text-sm text-gray-500 mb-1">
            {file ? file.name : "Selecione um arquivo .csv ou .tsv"}
          </p>

          <p className="text-xs text-gray-400 mb-3">
            Você também pode arrastar e soltar o arquivo aqui
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              openFileSelector();
            }}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-1.5 text-sm rounded-lg"
          >
            {loading ? "Enviando..." : "Escolher arquivo"}
          </button>
        </div>

        {/* Erro */}
        {error && (
          <p className="text-red-500 text-sm text-center mb-2">{error}</p>
        )}

        {/* Estado vazio */}
        {preview.length === 0 && !loading && (
          <p className="text-gray-300 text-sm text-center">
            Nenhum arquivo foi enviado ainda.
          </p>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2 text-sm">
              Pré-visualização ({previewRecordCount} registro{previewRecordCount === 1 ? "" : "s"})
            </h2>

            <div className="overflow-auto max-h-64 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {previewHeader.map((cell, j) => (
                      <th key={j} className="p-2 text-left font-semibold text-gray-700">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      {row.map((cell, j) => (
                        <td key={j} className="p-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Process Button */}
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={useBrazilianDateFormat}
                  onChange={(e) => setUseBrazilianDateFormat(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Converter datas para o formato DD/MM/AAAA</span>
              </label>

              <button
                onClick={handleProcess}
                className="h-10 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 text-sm rounded-lg"
              >
                {loading ? "Processando arquivo..." : "Processar arquivo"}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="mt-6 bg-gray-50 p-4 rounded-xl border">
            <p className="font-medium text-green-600 mb-2 text-sm">
              Limpeza concluída com sucesso.
            </p>

            <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm mb-4">
              <p className="text-gray-700">
                <span className="font-semibold">Resumo:</span>{" "}
                {removedRecords > 0
                  ? `${removedRecords} registro(s) removido(s) durante a limpeza.`
                  : "Nenhum registro foi removido (não havia linhas vazias/duplicadas após limpeza)."}
              </p>
              <p className="text-gray-700 mt-1">
                <span className="font-semibold">Datas:</span>{" "}
                {datesChecked} valor(es) analisado(s), {datesValid} válido(s) e {datesInvalid} inválido(s)
                {datesChecked > 0 ? ` (${invalidRate}% inválidos)` : ""}.
              </p>
              <p className="text-gray-700 mt-1">
                <span className="font-semibold">Conversão:</span>{" "}
                {stats.date_format === "br"
                  ? `${datesChanged} data(s) convertida(s) para DD/MM/AAAA.`
                  : "Formato de data mantido como no arquivo original."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-gray-400">Registros antes</p>
                <p className="text-lg font-bold">{beforeRecords}</p>
              </div>

              <div>
                <p className="text-gray-400">Registros depois</p>
                <p className="text-lg font-bold">{afterRecords}</p>
              </div>

              <div>
                <p className="text-gray-400">Removidos</p>
                <p className="text-lg font-bold text-red-500">
                  {removedRecords}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="mt-4 bg-black hover:bg-gray-800 text-white px-5 py-1.5 text-sm rounded-lg"
            >
              Baixar nova versão do arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}