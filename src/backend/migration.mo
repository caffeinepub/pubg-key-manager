import Map "mo:core/Map";

module {
  type KeyRecord = {
    keyValue : Text;
    durationDays : Nat;
    expiryTimestamp : Int;
    boundDeviceId : ?Text;
    createdAt : Int;
  };

  type OldActor = {
    nextId : Nat;
    keyStore : Map.Map<Text, KeyRecord>;
  };

  type NewActor = {
    keyStore : Map.Map<Text, KeyRecord>;
  };

  public func run(old : OldActor) : NewActor {
    { keyStore = old.keyStore };
  };
};
