export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function handle(err: unknown) {
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.message, extra: err.extra ?? null },
      { status: err.status },
    );
  }
  console.error(err);
  return Response.json({ error: "Server error" }, { status: 500 });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}
