pub struct Process {
    pub proc_in: bool,
    pub proc_out: bool,
    pub proc_file: String,
}

impl Process {
    pub fn new(proc_in: bool, proc_out: bool, proc_file: String) -> Self {
        Self {
            proc_in,
            proc_out,
            proc_file,
        }
    }

    pub fn procss(&self) {
        unimplemented!();
    }
}