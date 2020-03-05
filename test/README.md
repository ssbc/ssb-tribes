These tests contain several things:

1. tests against private-group-spec vectors
    - derivation of group-id
    - opening an enveloped scuttlebutt message (envelope-js is tested, but this makes sure it's mapped into the scuttlebutt context correctly, and correct key schemes are being used)
    - derivation of shared DM key from feedIds
2. functionality to generate test vectors used in (1)
3. tests over this modules functionality
    - /method - ssb log mutations
    - /key-store - off-log database for tracking group keys
    - integration tests: publishing + reading a range of envelope messages
