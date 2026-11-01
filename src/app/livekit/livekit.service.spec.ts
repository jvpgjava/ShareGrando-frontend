import { TestBed } from '@angular/core/testing';
import { ConnectionState, Room } from 'livekit-client';
import { LIVEKIT_ROOM_FACTORY, LivekitService } from './livekit.service';

describe('LivekitService', () => {
  it('connects through the LiveKit room factory and tracks participant state', async () => {
    const room = {
      on: jasmine.createSpy('on').and.callFake(function (this: unknown) {
        return this;
      }),
      connect: jasmine.createSpy('connect').and.resolveTo(undefined),
      disconnect: jasmine.createSpy('disconnect'),
      removeAllListeners: jasmine.createSpy('removeAllListeners'),
      numParticipants: 2,
      remoteParticipants: new Map([['viewer1', { identity: 'viewer-1' }]]),
      localParticipant: { identity: 'publisher' },
    } as unknown as Room;
    const factory = jasmine.createSpy('factory').and.returnValue(room);

    TestBed.configureTestingModule({
      providers: [LivekitService, { provide: LIVEKIT_ROOM_FACTORY, useValue: factory }],
    });

    const service = TestBed.inject(LivekitService);
    await service.connectPublisherReady('wss://livekit.test', 'jwt');

    expect(factory).toHaveBeenCalled();
    expect(room.connect).toHaveBeenCalledWith('wss://livekit.test', 'jwt');
    expect(service.connectionState()).toBe(ConnectionState.Disconnected);
    expect(service.participantsCount()).toBe(1);

    await service.disconnect();
    expect(room.disconnect).toHaveBeenCalled();
  });
});
