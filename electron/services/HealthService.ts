import { checkCache, checkGta, checkSamp } from "./health"
import { HealthCheckPayload } from "../ipc/channels"

export class HealthService {
  public async performFullCheck(): Promise<HealthCheckPayload> {
    const [gta, samp, cache] = [checkGta(), checkSamp(), await checkCache()]
    return { gta, samp, cache }
  }
}
