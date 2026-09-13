"use client"

import { Loader2 } from "lucide-react"

import { ApiKeyList } from "@/components/api-keys/api-key-list"
import { ApiUsageDocs } from "@/components/api-keys/api-usage-docs"
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog"
import { useApiKeys } from "@/hooks/use-api-keys"

export function ApiKeysManager({ userId }: { userId: string }) {
  const { keys, isLoading, error, createKey, isCreating, revokeKey } = useApiKeys(userId)

  return (
    <div className="flex flex-col gap-6">
      <ApiUsageDocs />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Your Keys</h2>
          <CreateApiKeyDialog createKey={createKey} isCreating={isCreating} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <ApiKeyList keys={keys} onRevoke={revokeKey} />
        )}
      </div>
    </div>
  )
}
