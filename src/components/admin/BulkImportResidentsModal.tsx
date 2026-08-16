"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, CheckCircleIcon, DownloadIcon, UploadIcon } from "@/components/ui/icons";

type Step = "select" | "preview" | "result";

interface ValidatedRow {
  rowNumber: number;
  hostelRaw: string;
  hostelId: number | null;
  name: string;
  email: string;
  roomNumber: string;
  errors: string[];
  category: "valid" | "invalid" | "duplicate";
}

interface PreviewSummary {
  total: number;
  valid: number;
  duplicate: number;
  invalid: number;
}

interface PreviewResponse {
  preview: true;
  rows: ValidatedRow[];
  summary: PreviewSummary;
}

interface ImportedResident {
  name: string;
  email: string;
  roomNumber: string;
  hostelId: number;
  residentCode: string;
  tempPassword: string;
}

interface CommitResponse {
  preview: false;
  imported: ImportedResident[];
  failed: { rowNumber: number; email: string; error: string }[];
  summary: PreviewSummary & { importedCount: number; failedCount: number };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function BulkImportResidentsModal({ onImported }: { onImported: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("select");
    setCsvText("");
    setFileName("");
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  async function requestPreview(text: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/residents/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: text, confirm: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not parse CSV");
        return;
      }
      setPreview(data);
      setStep("preview");
    } catch {
      setError("Something went wrong reading the file");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      void requestPreview(text);
    };
    reader.onerror = () => setError("Could not read the selected file");
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/residents/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setResult(data);
      setStep("result");
      toast.success(`Imported ${data.imported.length} resident${data.imported.length === 1 ? "" : "s"}`);
      onImported();
    } catch {
      setError("Something went wrong during import");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadResults() {
    if (!result) return;
    const header = "name,email,resident_code,temp_password\n";
    const body = result.imported
      .map(
        (r) =>
          `${csvEscape(r.name)},${csvEscape(r.email)},${csvEscape(r.residentCode)},${csvEscape(r.tempPassword)}`
      )
      .join("\n");
    downloadTextFile("import-results.csv", header + body + "\n");
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UploadIcon className="h-4 w-4" />
        Import CSV
      </Button>

      <Modal
        open={open}
        onClose={handleClose}
        size="lg"
        title={
          step === "select"
            ? "Import residents from CSV"
            : step === "preview"
              ? "Review before importing"
              : "Import complete"
        }
        description={
          step === "select"
            ? "Columns: hostel, name, email, room_number"
            : step === "preview"
              ? `${preview?.summary.valid ?? 0} of ${preview?.summary.total ?? 0} rows are ready to import.`
              : undefined
        }
      >
        {step === "select" && (
          <div className="space-y-4">
            <label
              htmlFor="csv-file"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
            >
              <UploadIcon className="h-6 w-6 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {fileName || "Click to select a .csv file"}
              </span>
              <span className="text-xs text-slate-400">hostel, name, email, room_number</span>
              <input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {loading && <p className="text-center text-sm text-slate-400">Parsing CSV...</p>}
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangleIcon className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{preview.summary.valid} valid</Badge>
              <Badge tone="amber">{preview.summary.duplicate} duplicate</Badge>
              <Badge tone="red">{preview.summary.invalid} invalid</Badge>
            </div>

            <TableContainer>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <THead>
                    <Th>Row</Th>
                    <Th>Hostel</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Room</Th>
                    <Th>Status</Th>
                  </THead>
                  <TBody>
                    {preview.rows.map((row) => (
                      <Tr key={row.rowNumber}>
                        <Td className="text-slate-400">{row.rowNumber}</Td>
                        <Td>{row.hostelRaw || "—"}</Td>
                        <Td className="font-medium text-slate-900">{row.name || "—"}</Td>
                        <Td>{row.email || "—"}</Td>
                        <Td>{row.roomNumber || "—"}</Td>
                        <Td title={row.errors.join("; ")}>
                          {row.category === "valid" ? (
                            <Badge tone="green">Ready</Badge>
                          ) : row.category === "duplicate" ? (
                            <Badge tone="amber">Duplicate</Badge>
                          ) : (
                            <Badge tone="red">{row.errors[0]}</Badge>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            </TableContainer>

            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangleIcon className="h-4 w-4" />
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Choose a different file
              </Button>
              <Button onClick={handleConfirmImport} loading={loading} disabled={preview.summary.valid === 0}>
                Import {preview.summary.valid} resident{preview.summary.valid === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{result.imported.length} imported</Badge>
              <Badge tone="red">{result.failed.length} failed</Badge>
              <Badge tone="amber">{result.summary.duplicate} duplicate</Badge>
              <Badge tone="slate">{result.summary.invalid} invalid</Badge>
            </div>

            {result.failed.length > 0 && (
              <TableContainer>
                <Table>
                  <THead>
                    <Th>Row</Th>
                    <Th>Email</Th>
                    <Th>Error</Th>
                  </THead>
                  <TBody>
                    {result.failed.map((f) => (
                      <Tr key={f.rowNumber}>
                        <Td className="text-slate-400">{f.rowNumber}</Td>
                        <Td>{f.email}</Td>
                        <Td className="text-red-600">{f.error}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableContainer>
            )}

            {result.imported.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium">Share these temporary credentials securely</p>
                  <p className="mt-1 text-xs text-amber-700">They will not be shown again.</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {result.imported.length > 0 && (
                <Button variant="outline" onClick={handleDownloadResults}>
                  <DownloadIcon className="h-4 w-4" />
                  Download credentials CSV
                </Button>
              )}
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
