export class TorznabError extends Error {
  constructor(
    public readonly code: number,
    description: string
  ) {
    super(description)
    this.name = 'TorznabError'
  }
}
