import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/security-test")({
  component: SecurityTestPage,
});

const TEST_CLIENT_ID = "57a6f7b0-1fe8-40e9-9429-e9732c767d70";

function SecurityTestPage() {
  const [result, setResult] = useState("Not tested");
  const [loading, setLoading] = useState(false);

  const TEST_CLIENT_ID = "202c9be3-0745-4d11-bb98-d8ab33997425";

  const testFormerMemberCaseAccess = async () => {
    setLoading(true);
    setResult("Testing...");
  
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", "57a6f7b0-1fe8-40e9-9429-e9732c767d70")
      .maybeSingle();
  
    if (error) {
      setResult(
        `PASS ✅\n\nFormer member could not access the organization case.\n\nCode: ${error.code}\nMessage: ${error.message}`,
      );
    } else if (!data) {
      setResult(
        "PASS ✅\n\nFormer member could not access the organization case.",
      );
    } else {
      setResult(
        `FAIL ❌\n\nFormer member can still access the organization case.\n\n${JSON.stringify(data, null, 2)}`,
      );
    }
  
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Security Test</h1>

      <div className="rounded-lg border p-4">
        <p>
        Testing whether a former organization member can still access
a case belonging to Organization 1.
        </p>

        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          Client ID: {TEST_CLIENT_ID}
        </p>
      </div>

      <button
  type="button"
  onClick={testFormerMemberCaseAccess}
  disabled={loading}
  className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
>
{loading ? "Testing..." : "Test Former Member Case Access"}
</button>

      <pre className="whitespace-pre-wrap rounded-lg border bg-muted p-4 text-sm">
        {result}
      </pre>
    </div>
  );
}