import path from 'path'
import { rootPgPool as pgPool } from './dbPools'
import { run, makeWorkerUtils } from 'graphile-worker'
import type { WorkerUtils, Runner } from 'graphile-worker'
import type { Express } from 'express'
import { Locals } from '@/types'

let workerUtils: WorkerUtils
let runner: Runner

const taskDirectory = path.resolve('./worker/tasks')

export async function installWorker(app: Express): Promise<void> {
  workerUtils = await makeWorkerUtils({ pgPool })
  await workerUtils.migrate()

  runner = await run({ pgPool, taskDirectory })

  ;(app.locals as Locals).shutdownHooks.push(async () => {
    await runner.stop()
    await workerUtils.release()
  })

  await runner.promise
}

export function getRunner(): Runner {
  return runner
}

export function getWorkerUtils(): WorkerUtils {
  return workerUtils
}
