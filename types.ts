
export interface ScriptResult {
  text: string;
  estimatedTime: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  GENERATING = 'GENERATING',
  ERROR = 'ERROR'
}
