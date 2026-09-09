import {
  getCurrentUser,
  restSelect,
  rpcRequest,
} from "@/lib/supabase/browser";

type Result<T> = {
  data: T | null;
  error: string | null;
};

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] };

function encodeFilterValue(value: unknown) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return encodeURIComponent(String(value));
}

function buildQuery(selectClause: string, filters: Filter[]) {
  const parts = [`select=${selectClause || "*"}`];

  for (const filter of filters) {
    if (filter.kind === "eq") {
      parts.push(
        `${encodeURIComponent(filter.column)}=eq.${encodeFilterValue(filter.value)}`,
      );
      continue;
    }

    const values = filter.values
      .map((value) => String(value).replace(/"/g, '\\"'))
      .map((value) => `"${value}"`)
      .join(",");

    parts.push(
      `${encodeURIComponent(filter.column)}=in.(${encodeURIComponent(values)})`,
    );
  }

  return parts.join("&");
}

class MeloQueryBuilder<T = Record<string, unknown>> implements PromiseLike<Result<T[]>> {
  private readonly filters: Filter[] = [];
  private selectClause = "*";

  constructor(private readonly tableName: string) {}

  select(columns = "*") {
    this.selectClause = columns || "*";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: "in", column, values: Array.isArray(values) ? values : [] });
    return this;
  }

  async maybeSingle(): Promise<Result<T>> {
    const result = await this.execute();
    return {
      data: Array.isArray(result.data) ? (result.data[0] ?? null) : null,
      error: result.error,
    };
  }

  private async execute(): Promise<Result<T[]>> {
    return restSelect<T[]>(
      this.tableName,
      buildQuery(this.selectClause, this.filters),
    );
  }

  then<TResult1 = Result<T[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<T[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const meloWebSupabase = {
  auth: {
    async getSession() {
      const user = await getCurrentUser();
      return {
        data: {
          session: user ? { user } : null,
        },
        error: null,
      };
    },
  },

  from<T = Record<string, unknown>>(tableName: string) {
    return new MeloQueryBuilder<T>(tableName);
  },

  async rpc<T = unknown>(
    functionName: string,
    params: Record<string, unknown> = {},
  ): Promise<Result<T>> {
    return rpcRequest<T>(functionName, params);
  },
};
