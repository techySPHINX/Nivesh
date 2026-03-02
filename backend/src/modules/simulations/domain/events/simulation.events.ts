import { BaseEvent } from '../../../../core/messaging/events/base.event';
import { SimulationType } from '../entities/simulation.entity';

export class SimulationStartedEvent extends BaseEvent {
  constructor(
    public readonly simulationId: string,
    public readonly userId: string,
    public readonly type: SimulationType,
    public readonly name: string,
  ) {
    super({
      eventType: 'simulation.started',
      aggregateId: simulationId,
      aggregateType: 'Simulation',
    });
  }
}

export class SimulationCompletedEvent extends BaseEvent {
  constructor(
    public readonly simulationId: string,
    public readonly userId: string,
    public readonly type: SimulationType,
    public readonly medianResult: number,
    public readonly completedAt: Date,
  ) {
    super({
      eventType: 'simulation.completed',
      aggregateId: simulationId,
      aggregateType: 'Simulation',
    });
  }
}

export class SimulationFailedEvent extends BaseEvent {
  constructor(
    public readonly simulationId: string,
    public readonly userId: string,
    public readonly error: string,
  ) {
    super({
      eventType: 'simulation.failed',
      aggregateId: simulationId,
      aggregateType: 'Simulation',
    });
  }
}
