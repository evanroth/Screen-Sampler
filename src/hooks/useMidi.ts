import { useState, useEffect, useCallback, useRef } from 'react';

export interface MidiMessage {
  type: 'noteon' | 'noteoff' | 'cc';
  channel: number;
  note?: number; // For note messages
  cc?: number; // For CC messages
  value: number; // Velocity for notes, value for CC
  timestamp: number;
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

interface UseMidiResult {
  isSupported: boolean;
  isEnabled: boolean;
  devices: MidiDevice[];
  activeDeviceId: string | null;
  lastMessage: MidiMessage | null;
  error: string | null;
  enable: () => Promise<boolean>;
  disable: () => void;
  selectDevice: (deviceId: string | null) => void;
}

export function useMidi(onMessage?: (message: MidiMessage) => void): UseMidiResult {
  const [isSupported] = useState(() => 'requestMIDIAccess' in navigator);
  const [isEnabled, setIsEnabled] = useState(false);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MidiMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const onMessageRef = useRef(onMessage);
  
  // Keep callback ref updated
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Parse MIDI message bytes
  const parseMidiMessage = useCallback((data: Uint8Array): MidiMessage | null => {
    if (data.length < 2) return null;
    
    const status = data[0];
    const channel = (status & 0x0F) + 1;
    const messageType = status & 0xF0;
    
    const timestamp = performance.now();
    
    switch (messageType) {
      case 0x90: // Note On
        if (data[2] === 0) {
          // Note On with velocity 0 is actually Note Off
          return { type: 'noteoff', channel, note: data[1], value: 0, timestamp };
        }
        return { type: 'noteon', channel, note: data[1], value: data[2], timestamp };
      case 0x80: // Note Off
        return { type: 'noteoff', channel, note: data[1], value: data[2], timestamp };
      case 0xB0: // Control Change
        return { type: 'cc', channel, cc: data[1], value: data[2], timestamp };
      default:
        return null;
    }
  }, []);

  // Handle incoming MIDI messages
  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const message = parseMidiMessage(event.data);
    if (message) {
      setLastMessage(message);
      onMessageRef.current?.(message);
    }
  }, [parseMidiMessage]);

  // Update device list
  const updateDevices = useCallback((midiAccess: MIDIAccess) => {
    const inputDevices: MidiDevice[] = [];
    midiAccess.inputs.forEach((input) => {
      inputDevices.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
      });
    });
    setDevices(inputDevices);
    
    // Auto-select first device if none selected
    if (!activeDeviceId && inputDevices.length > 0) {
      setActiveDeviceId(inputDevices[0].id);
    }
  }, [activeDeviceId]);

  // Connect to a specific device
  const connectToDevice = useCallback((deviceId: string | null) => {
    const midiAccess = midiAccessRef.current;
    if (!midiAccess) return;
    
    // Disconnect from all devices first
    midiAccess.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
    
    // Connect to selected device
    if (deviceId) {
      const input = midiAccess.inputs.get(deviceId);
      if (input) {
        input.onmidimessage = handleMidiMessage;
      }
    }
  }, [handleMidiMessage]);

  // Select a device
  const selectDevice = useCallback((deviceId: string | null) => {
    setActiveDeviceId(deviceId);
    if (isEnabled) {
      connectToDevice(deviceId);
    }
  }, [isEnabled, connectToDevice]);

  // Enable MIDI
  const enable = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Web MIDI is not supported in this browser');
      return false;
    }
    
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      midiAccessRef.current = midiAccess;
      
      // Listen for device changes
      midiAccess.onstatechange = () => {
        updateDevices(midiAccess);
      };
      
      updateDevices(midiAccess);
      setIsEnabled(true);
      setError(null);
      
      // Connect to active device
      if (activeDeviceId) {
        connectToDevice(activeDeviceId);
      } else if (devices.length > 0) {
        connectToDevice(devices[0].id);
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access MIDI devices';
      setError(message);
      return false;
    }
  }, [isSupported, activeDeviceId, devices, updateDevices, connectToDevice]);

  // Disable MIDI
  const disable = useCallback(() => {
    const midiAccess = midiAccessRef.current;
    if (midiAccess) {
      midiAccess.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      midiAccess.onstatechange = null;
    }
    midiAccessRef.current = null;
    setIsEnabled(false);
    setLastMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disable();
    };
  }, [disable]);

  // Reconnect when active device changes while enabled
  useEffect(() => {
    if (isEnabled && activeDeviceId) {
      connectToDevice(activeDeviceId);
    }
  }, [isEnabled, activeDeviceId, connectToDevice]);

  return {
    isSupported,
    isEnabled,
    devices,
    activeDeviceId,
    lastMessage,
    error,
    enable,
    disable,
    selectDevice,
  };
}
