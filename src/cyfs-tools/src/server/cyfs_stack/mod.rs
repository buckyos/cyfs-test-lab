pub mod peer;
pub mod command;
pub mod connection;

use crate::lib::{LpcCommand,Lpc};

pub fn stack_LpcServer(peer:&peer::Peer,name:String,c:LpcCommand, lpc: Lpc){
    match name.as_str(){
        "sendCommand" =>{
            peer.on_sendCommand(c,lpc.clone());
        }
        "startEvent" => {
            peer.on_startEvent(c,lpc.clone());
        }
        "emitEvent" =>{
            peer.on_startEvent(c,lpc.clone());
        }
        x => panic!("Unexpected invalid system Name {:?}", x),  
    } 
}
