import Map "mo:core/Map";
import Int "mo:core/Int";
import Text "mo:core/Text";

module {
  type KeyRecord = {
    keyValue : Text;
    durationDays : Nat;
    expiryTimestamp : Int;
    boundDeviceId : ?Text;
    createdAt : Int;
  };

  type OldActor = {
    adminPassword : Text;
    keyStore : Map.Map<Text, KeyRecord>;
  };

  type NewActor = {
    keyStore : Map.Map<Text, KeyRecord>;
    adminPassword : Text;
  };

  public func run(old : OldActor) : NewActor {
    { old with keyStore = old.keyStore };
  };
};
